package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CheckInRequest {

    @NotBlank(message = "请输入现场签到码")
    @Pattern(regexp = "\\d{6}", message = "签到码应为6位数字")
    private String code;
}
