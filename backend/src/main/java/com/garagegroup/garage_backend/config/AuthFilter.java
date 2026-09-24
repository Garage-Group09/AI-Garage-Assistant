package com.garagegroup.garage_backend.config;

import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.service.AuthSessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * Intercepts requests to validate server-side session tokens.
 * Rejects unauthenticated requests to protected endpoints with 401.
 * Enforces admin role for /api/admin/** with 403.
 * Attaches the authenticated User as request attribute "currentUser".
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    @Autowired
    private AuthSessionService authSessionService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Allow CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Resolve token from Authorization or X-Auth-Token header
        String token = resolveToken(request);
        User currentUser = null;
        if (token != null) {
            currentUser = authSessionService.getAuthenticatedUser(token);
        }

        if (currentUser != null) {
            request.setAttribute("currentUser", currentUser);
            request.setAttribute("sessionToken", token);

            List<SimpleGrantedAuthority> authorities = currentUser.isAdmin()
                    ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER"))
                    : List.of(new SimpleGrantedAuthority("ROLE_USER"));

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    currentUser,
                    token,
                    authorities
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        // Determine if path requires authentication
        if (isPublicEndpoint(path, method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // All non-public /api/** endpoints require authentication
        if (path.startsWith("/api/")) {
            if (currentUser == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Authentication required. Please log in.\"}");
                return;
            }

            // Check admin authorization for /api/admin/**
            if (path.startsWith("/api/admin")) {
                if (!currentUser.isAdmin()) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Access denied. Administrator privileges required.\"}");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isPublicEndpoint(String path, String method) {
        // Public Auth
        if ("/api/auth/login".equals(path) || "/api/auth/register".equals(path)) {
            return true;
        }
        // Public Brand and Model catalog browsing (GET only)
        if ("GET".equalsIgnoreCase(method) && (path.startsWith("/api/brands") || path.startsWith("/api/models"))) {
            return true;
        }
        // Public Garage browsing (GET only) — exclude /recommend which requires auth
        if ("GET".equalsIgnoreCase(method) && path.startsWith("/api/garages") && !path.contains("/recommend")) {
            return true;
        }
        // Non-api requests (static assets, error pages)
        if (!path.startsWith("/api/")) {
            return true;
        }
        return false;
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7).trim();
        }
        String xAuthToken = request.getHeader("X-Auth-Token");
        if (xAuthToken != null && !xAuthToken.isBlank()) {
            return xAuthToken.trim();
        }
        return null;
    }
}
