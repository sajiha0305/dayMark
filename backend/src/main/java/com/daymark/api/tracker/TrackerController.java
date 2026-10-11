package com.daymark.api.tracker;

import com.daymark.api.user.AppUserPrincipal;
import jakarta.validation.Valid;
import java.util.UUID;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tracker")
public class TrackerController {
    private final TrackerService trackerService;

    public TrackerController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public TrackerState read(Authentication authentication) {
        return trackerService.read(userId(authentication));
    }

    @GetMapping("/import-status")
    public Map<String, Boolean> migrationStatus(Authentication authentication) {
        return Map.of("available", trackerService.migrationAvailable(userId(authentication)));
    }

    @PutMapping
    public TrackerState replace(Authentication authentication, @Valid @RequestBody TrackerState state) {
        return trackerService.replace(userId(authentication), state, false);
    }

    @PostMapping("/import")
    public TrackerState importBrowserData(Authentication authentication, @Valid @RequestBody TrackerState state) {
        return trackerService.replace(userId(authentication), state, true);
    }

    private UUID userId(Authentication authentication) {
        return ((AppUserPrincipal) authentication.getPrincipal()).id();
    }
}