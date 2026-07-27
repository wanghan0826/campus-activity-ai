package com.xxx.campus.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivityScheduleItem {

    @Column(name = "schedule_time", length = 100)
    private String time;

    @Column(name = "schedule_content", length = 500)
    private String content;
}
