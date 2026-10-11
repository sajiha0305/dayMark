package com.daymark.api.tracker;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record TrackerState(
        @NotNull @DecimalMin("0.00") BigDecimal income,
        @NotBlank @Pattern(regexp = "USD|INR|EUR|GBP") String currency,
        @NotNull @Size(max = 100) List<@Valid Category> categories,
        @NotNull @Size(max = 5000) List<@Valid Expense> expenses,
        @NotNull @Size(max = 100) List<@Valid Hobby> hobbies,
        @NotNull @Size(max = 10000) List<@Valid HobbyLog> hobbyLogs) {

    public static TrackerState defaults() {
        return new TrackerState(BigDecimal.ZERO, "USD", List.of(
                new Category("home", "Home & bills", BigDecimal.ZERO),
                new Category("food", "Groceries", BigDecimal.ZERO),
                new Category("transport", "Transport", BigDecimal.ZERO),
                new Category("health", "Health", BigDecimal.ZERO),
                new Category("fun", "Eating out & fun", BigDecimal.ZERO),
                new Category("other", "Everything else", BigDecimal.ZERO)), List.of(), List.of(), List.of());
    }

    public record Category(
            @NotBlank @Size(max = 80) String id,
            @NotBlank @Size(max = 30) String name,
            @NotNull @DecimalMin("0.00") BigDecimal limit) {
    }

    public record Expense(
            @NotBlank @Size(max = 80) String id,
            @NotBlank @Size(max = 60) String title,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank @Size(max = 80) String categoryId,
            @NotNull LocalDate date) {
    }

    public record Hobby(
            @NotBlank @Size(max = 80) String id,
            @NotBlank @Size(max = 40) String name,
            @NotNull @DecimalMin("1") Integer dailyGoal) {
    }

    public record HobbyLog(
            @NotBlank @Size(max = 80) String id,
            @NotBlank @Size(max = 80) String hobbyId,
            @NotNull @DecimalMin("1") Integer minutes,
            @NotNull LocalDate date) {
    }
}