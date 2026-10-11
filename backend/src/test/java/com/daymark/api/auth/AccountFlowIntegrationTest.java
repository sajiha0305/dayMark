package com.daymark.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daymark.api.tracker.TrackerDocumentRepository;
import com.daymark.api.tracker.TrackerState;
import com.daymark.api.user.AppUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountFlowIntegrationTest {
    private static final String PASSWORD = "Correct-Horse-Battery-42!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private TrackerDocumentRepository trackerDocuments;

    @BeforeEach
    void clearData() {
        trackerDocuments.deleteAll();
        users.deleteAll();
    }

    @Test
    void usernameIsNormalizedAndUniqueAndNewAccountsCanSignInImmediately() throws Exception {
        register("Sajiha_1");

        assertThat(users.findByUsername("sajiha_1")).isPresent();
        login("SAJIHA_1");

        mockMvc.perform(post("/api/auth/register")
                        .with(csrfCookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("SAJIHA_1")))
                .andExpect(status().isConflict());
    }

    @Test
    void usersHaveSeparatePersistentTrackerDocuments() throws Exception {
        register("one_user");
        MockHttpSession firstSession = login("one_user");

        TrackerState firstState = new TrackerState(
                new BigDecimal("4500.00"), "USD",
                List.of(new TrackerState.Category("food", "Groceries", new BigDecimal("700.00"))),
                List.of(), List.of(), List.of());
        mockMvc.perform(put("/api/tracker")
                        .session(firstSession)
                        .with(csrfCookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstState)))
                .andExpect(status().isOk());

        register("two_user");
        MockHttpSession secondSession = login("two_user");

        mockMvc.perform(get("/api/tracker").session(secondSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.income").value(0));
        mockMvc.perform(get("/api/tracker").session(firstSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.income").value(4500.00));
    }

    @Test
    void browserImportIsOneTimeAndCannotOverwriteAnEditedAccount() throws Exception {
            register("import_user");
            MockHttpSession session = login("import_user");
            TrackerState importedState = new TrackerState(
                new BigDecimal("3000.00"), "USD",
                List.of(new TrackerState.Category("food", "Groceries", new BigDecimal("800.00"))),
                List.of(), List.of(), List.of());
            String body = objectMapper.writeValueAsString(importedState);

            mockMvc.perform(post("/api/tracker/import")
                    .session(session)
                    .with(csrfCookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isOk());
            mockMvc.perform(post("/api/tracker/import")
                    .session(session)
                    .with(csrfCookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isConflict());

            TrackerState editedState = new TrackerState(
                new BigDecimal("100.00"), "USD",
                List.of(new TrackerState.Category("food", "Groceries", BigDecimal.ZERO)),
                List.of(), List.of(), List.of());
            mockMvc.perform(put("/api/tracker")
                    .session(session)
                    .with(csrfCookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(editedState)))
                .andExpect(status().isOk());
            mockMvc.perform(post("/api/tracker/import")
                    .session(session)
                    .with(csrfCookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isConflict());
    }

    private void register(String username) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .with(csrfCookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(username)))
                .andExpect(status().isCreated());
    }

    private MockHttpSession login(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrfCookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(username)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String credentials(String username) throws Exception {
        return objectMapper.writeValueAsString(new AuthDtos.Credentials(username, PASSWORD));
    }

    private RequestPostProcessor csrfCookie() {
        return request -> {
            String token = UUID.randomUUID().toString();
            request.setCookies(new Cookie("XSRF-TOKEN", token));
            request.addHeader("X-XSRF-TOKEN", token);
            return request;
        };
    }
}
