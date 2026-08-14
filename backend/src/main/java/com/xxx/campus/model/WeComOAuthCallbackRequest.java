package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WeComOAuthCallbackRequest {
    @NotBlank(message = "缺少企业微信授权码")
    @Size(max = 512)
    private String code;

    @NotBlank(message = "缺少登录校验参数")
    @Size(max = 512)
    private String state;
}
