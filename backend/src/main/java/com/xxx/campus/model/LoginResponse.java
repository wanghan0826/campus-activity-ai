package com.xxx.campus.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class LoginResponse {
    private String token;
    private LocalDateTime expiresAt;
    private AuthUserView user;
}
