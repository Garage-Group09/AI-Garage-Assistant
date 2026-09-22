package com.garagegroup.garage_backend.dto;

import com.garagegroup.garage_backend.entity.User;

/**
 * Response DTO for admin user listings.
 * The password field is intentionally omitted.
 */
public class UserAdminDto {

    private Integer userId;
    private String name;
    private String email;
    private String contactNo;
    private String location;
    private boolean isAdmin;

    /** Convenience factory that maps a User entity to this DTO. */
    public static UserAdminDto from(User user) {
        UserAdminDto dto = new UserAdminDto();
        dto.userId    = user.getUserId();
        dto.name      = user.getName();
        dto.email     = user.getEmail();
        dto.contactNo = user.getContactNo();
        dto.location  = user.getLocation();
        dto.isAdmin   = user.isAdmin();
        return dto;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public Integer getUserId()   { return userId; }
    public String getName()      { return name; }
    public String getEmail()     { return email; }
    public String getContactNo() { return contactNo; }
    public String getLocation()  { return location; }
    public boolean isAdmin()     { return isAdmin; }
}
