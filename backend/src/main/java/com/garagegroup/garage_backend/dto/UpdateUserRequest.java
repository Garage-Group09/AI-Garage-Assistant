package com.garagegroup.garage_backend.dto;

/**
 * Request body for PUT /api/admin/users/{id}.
 * Only the fields an admin is allowed to change are exposed.
 */
public class UpdateUserRequest {

    private String name;
    private String email;
    private Boolean isAdmin;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getName()      { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail()     { return email; }
    public void setEmail(String email) { this.email = email; }

    public Boolean getIsAdmin()  { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
}
