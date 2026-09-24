package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.dto.LoginRequest;
import com.garagegroup.garage_backend.dto.RegisterRequest;
import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.garagegroup.garage_backend.service.AuthSessionService authSessionService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        // Explicitly enforce that registered users cannot assign themselves admin role
        user.setAdmin(false);
        // Hash the password with BCrypt before persisting
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);

        // Issue server-validated session token
        String token = authSessionService.createSession(saved);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", saved.getUserId());
        response.put("name", saved.getName());
        response.put("email", saved.getEmail());
        response.put("isAdmin", saved.isAdmin());
        response.put("token", token);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> optionalUser = userRepository.findByEmail(request.getEmail());

        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(401).body("Invalid email or password");
        }

        User user = optionalUser.get();

        // Use BCrypt-aware comparison instead of plain-text equals()
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid email or password");
        }

        // Issue server-validated session token
        String token = authSessionService.createSession(user);

        // Build a response that explicitly exposes isAdmin and token for the frontend
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("contactNo", user.getContactNo());
        response.put("location", user.getLocation());
        response.put("isAdmin", user.isAdmin());
        response.put("token", token);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-Auth-Token", required = false) String xAuthToken) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else if (xAuthToken != null && !xAuthToken.isBlank()) {
            token = xAuthToken.trim();
        }
        if (token != null) {
            authSessionService.invalidateSession(token);
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestAttribute(value = "currentUser", required = false) User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        Map<String, Object> response = new HashMap<>();
        response.put("userId", currentUser.getUserId());
        response.put("name", currentUser.getName());
        response.put("email", currentUser.getEmail());
        response.put("contactNo", currentUser.getContactNo());
        response.put("location", currentUser.getLocation());
        response.put("isAdmin", currentUser.isAdmin());
        return ResponseEntity.ok(response);
    }
}