package com.xxx.campus.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class OpenCheckInRequest {

    @DecimalMin(value = "-90.0", message = "纬度超出有效范围")
    @DecimalMax(value = "90.0", message = "纬度超出有效范围")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "经度超出有效范围")
    @DecimalMax(value = "180.0", message = "经度超出有效范围")
    private Double longitude;

    @DecimalMin(value = "0.0", message = "定位精度不能小于0")
    @DecimalMax(value = "5000.0", message = "定位精度数据异常")
    private Double accuracyMeters;

    @Min(value = 20, message = "签到范围不能小于20米")
    @Max(value = 1000, message = "签到范围不能超过1000米")
    private Integer radiusMeters;
}
