package com.daymark.api.tracker;

import com.daymark.api.user.AppUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TrackerService {
    private final TrackerDocumentRepository documents;
    private final ObjectMapper objectMapper;

    public TrackerService(TrackerDocumentRepository documents, ObjectMapper objectMapper) {
        this.documents = documents;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void initializeFor(AppUser user) {
        try {
            documents.save(new TrackerDocument(user, objectMapper.writeValueAsString(TrackerState.defaults())));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not initialize tracker data", exception);
        }
    }

    @Transactional(readOnly = true)
    public TrackerState read(UUID userId) {
        TrackerDocument document = documents.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tracker data not found"));
        try {
            return objectMapper.readValue(document.getStateJson(), TrackerState.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored tracker data could not be read", exception);
        }
    }

    @Transactional(readOnly = true)
    public boolean migrationAvailable(UUID userId) {
        TrackerDocument document = documents.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tracker data not found"));
        return !document.isMigrationImported();
    }

    @Transactional
    public TrackerState replace(UUID userId, TrackerState state, boolean importFromBrowser) {
        validateReferences(state);
        TrackerDocument document = documents.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tracker data not found"));
        if (importFromBrowser && document.isMigrationImported()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Browser data has already been imported");
        }
        if (importFromBrowser && !hasStarterState(document)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Import is only available before you add new data to this account");
        }
        try {
            document.setStateJson(objectMapper.writeValueAsString(state));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Tracker data is not valid JSON", exception);
        }
        if (importFromBrowser) {
            document.setMigrationImported(true);
        }
        documents.save(document);
        return state;
    }

    private void validateReferences(TrackerState state) {
        Set<String> categoryIds = new HashSet<>();
        state.categories().forEach(category -> {
            if (!categoryIds.add(category.id())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate category ID");
            }
        });
        for (TrackerState.Expense expense : state.expenses()) {
            if (!categoryIds.contains(expense.categoryId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expense refers to an unknown category");
            }
        }
        Set<String> hobbyIds = new HashSet<>();
        state.hobbies().forEach(hobby -> {
            if (!hobbyIds.add(hobby.id())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate hobby ID");
            }
        });
        for (TrackerState.HobbyLog log : state.hobbyLogs()) {
            if (!hobbyIds.contains(log.hobbyId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hobby log refers to an unknown hobby");
            }
        }
    }

    private boolean hasStarterState(TrackerDocument document) {
        try {
            return objectMapper.readValue(document.getStateJson(), TrackerState.class).equals(TrackerState.defaults());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored tracker data could not be read", exception);
        }
    }
}