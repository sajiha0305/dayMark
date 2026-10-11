package com.daymark.api.auth;

import com.daymark.api.tracker.TrackerService;
import com.daymark.api.user.AppUser;
import com.daymark.api.user.AppUserRepository;
import java.nio.charset.StandardCharsets;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TrackerService trackerService;

    public AuthService(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            TrackerService trackerService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.trackerService = trackerService;
    }

    @Transactional
    public void register(AuthDtos.Registration credentials) {
        String username = normalizeUsername(credentials.username());
        if (users.existsByUsername(username)) {
            throw new UsernameAlreadyRegisteredException();
        }
        if (credentials.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Password must be no more than 72 UTF-8 bytes");
        }

        AppUser user = new AppUser(username, passwordEncoder.encode(credentials.password()));
        try {
            user = users.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new UsernameAlreadyRegisteredException();
        }
        trackerService.initializeFor(user);
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
