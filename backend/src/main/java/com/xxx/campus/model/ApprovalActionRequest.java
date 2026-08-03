package com.xxx.campus.model;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApprovalActionRequest {

    @Size(max = 500, message = "审批意见不能超过 500 个字符")
    private String comment;
}
