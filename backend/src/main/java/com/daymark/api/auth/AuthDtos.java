package com.daymark.api.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record Registration(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{3,30}") String username,
            @NotBlank @Size(min = 12, max = 72) String password) {
    }

    public record Credentials(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9._@+-]{3,254}") String username,
            @NotBlank @Size(min = 12, max = 72) String password) {
    }

    public record Account(UUID id, String username) {
    }

    public record Message(String message) {
    }
}
