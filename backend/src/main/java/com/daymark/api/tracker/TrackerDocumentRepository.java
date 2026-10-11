package com.daymark.api.tracker;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackerDocumentRepository extends JpaRepository<TrackerDocument, UUID> {
    Optional<TrackerDocument> findByUserId(UUID userId);
}