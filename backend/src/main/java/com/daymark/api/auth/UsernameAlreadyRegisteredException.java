package com.daymark.api.auth;

public class UsernameAlreadyRegisteredException extends RuntimeException {
    public UsernameAlreadyRegisteredException() {
        super("That username is already taken");
    }
}
