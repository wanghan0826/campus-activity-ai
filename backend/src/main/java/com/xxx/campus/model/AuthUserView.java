package com.xxx.campus.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthUserView {
    private String id;
    private String username;
    private String displayName;
    private String role;
    private String collegeCode;
    private String collegeName;
    private String authSource;
}
