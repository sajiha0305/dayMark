package com.daymark.api.tracker;

import com.daymark.api.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tracker_documents")
public class TrackerDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    @Column(name = "state_json", nullable = false, columnDefinition = "text")
    private String stateJson;

    @Column(name = "migration_imported", nullable = false)
    private boolean migrationImported;

    protected TrackerDocument() {
    }

    public TrackerDocument(AppUser user, String stateJson) {
        this.user = user;
        this.stateJson = stateJson;
    }

    public String getStateJson() {
        return stateJson;
    }

    public void setStateJson(String stateJson) {
        this.stateJson = stateJson;
    }

    public boolean isMigrationImported() {
        return migrationImported;
    }

    public void setMigrationImported(boolean migrationImported) {
        this.migrationImported = migrationImported;
    }
}