package com.daymark.api.auth;

import com.daymark.api.user.AppUser;
import com.daymark.api.user.AppUserPrincipal;
import com.daymark.api.user.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final AppUserRepository users;

    public AuthController(
            AuthService authService,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            AppUserRepository users) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.users = users;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDtos.Message> register(@Valid @RequestBody AuthDtos.Registration credentials) {
        authService.register(credentials);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthDtos.Message("Account created. You can now sign in."));
    }

    @PostMapping("/login")
    public AuthDtos.Account login(
            @Valid @RequestBody AuthDtos.Credentials credentials,
            HttpServletRequest request,
            HttpServletResponse response) {
        String username = credentials.username().trim().toLowerCase(java.util.Locale.ROOT);
        AppUser user = users.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(username, credentials.password()));
        request.getSession(true);
        request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        return account(user);
    }

    @GetMapping("/me")
    public AuthDtos.Account me(Authentication authentication) {
        return account((AppUserPrincipal) authentication.getPrincipal());
    }

    private AuthDtos.Account account(AppUser user) {
        return new AuthDtos.Account(user.getId(), user.getUsername());
    }

    private AuthDtos.Account account(AppUserPrincipal user) {
        return new AuthDtos.Account(user.id(), user.username());
    }
}
