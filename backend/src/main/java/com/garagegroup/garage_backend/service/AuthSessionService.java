package com.garagegroup.garage_backend.service;

import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-side session manager.
 * Issues and validates cryptographic random session tokens,
 * keeping track of authenticated users and role status.
 */
@Service
public class AuthSessionService {

    public static class UserSession {
        private final Integer userId;
        private final String email;
        private final String name;
        private final boolean isAdmin;
        private final Instant createdAt;
        private volatile Instant lastAccessedAt;

        public UserSession(Integer userId, String email, String name, boolean isAdmin) {
            this.userId = userId;
            this.email = email;
            this.name = name;
            this.isAdmin = isAdmin;
            this.createdAt = Instant.now();
            this.lastAccessedAt = Instant.now();
        }

        public Integer getUserId() { return userId; }
        public String getEmail() { return email; }
        public String getName() { return name; }
        public boolean isAdmin() { return isAdmin; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getLastAccessedAt() { return lastAccessedAt; }
        public void touch() { this.lastAccessedAt = Instant.now(); }
    }

    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();

    @Autowired
    private UserRepository userRepository;

    /**
     * Issues a new session token for the given authenticated user.
     */
    public String createSession(User user) {
        String token = UUID.randomUUID().toString();
        UserSession session = new UserSession(
                user.getUserId(),
                user.getEmail(),
                user.getName(),
                user.isAdmin()
        );
        activeSessions.put(token, session);
        return token;
    }

    /**
     * Retrieves the fresh User entity from the DB for the given token,
     * ensuring any live role changes are immediately reflected.
     * Returns null if the token is invalid or the session does not exist.
     */
    public User getAuthenticatedUser(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        UserSession session = activeSessions.get(token);
        if (session == null) {
            return null;
        }
        session.touch();

        Optional<User> opt = userRepository.findById(session.getUserId());
        return opt.orElse(null);
    }

    /**
     * Retrieves the cached session metadata.
     */
    public UserSession getSession(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return activeSessions.get(token);
    }

    /**
     * Invalidates a session (called on logout).
     */
    public void invalidateSession(String token) {
        if (token != null && !token.isBlank()) {
            activeSessions.remove(token);
        }
    }

    /**
     * Invalidates all active sessions for a specific user ID.
     */
    public void invalidateAllForUser(Integer userId) {
        if (userId == null) return;
        activeSessions.entrySet().removeIf(entry -> userId.equals(entry.getValue().getUserId()));
    }
}
