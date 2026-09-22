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

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        // Hash the password with BCrypt before persisting
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
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

        // Build a response that explicitly exposes isAdmin for the frontend
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("contactNo", user.getContactNo());
        response.put("location", user.getLocation());
        response.put("isAdmin", user.isAdmin());

        return ResponseEntity.ok(response);
    }
}