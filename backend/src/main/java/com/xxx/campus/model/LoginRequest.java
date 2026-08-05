package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "请输入用户名")
    @Size(max = 100, message = "用户名长度不能超过100个字符")
    private String username;

    @NotBlank(message = "请输入密码")
    @Size(max = 200, message = "密码长度不能超过200个字符")
    private String password;
}
