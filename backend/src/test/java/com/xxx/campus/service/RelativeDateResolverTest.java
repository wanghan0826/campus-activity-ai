package com.xxx.campus.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RelativeDateResolverTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-08-03T04:30:00Z"),
            ZoneId.of("Asia/Shanghai")
    );

    private final RelativeDateResolver resolver = new RelativeDateResolver(FIXED_CLOCK);

    @Test
    void shouldResolveNearestAndExplicitWeekExpressions() {
        Map<String, LocalDate> resolved = resolver.resolveWeekdayMentions(
                "星期四下午活动，本周日复盘，下周四汇报，下下星期一归档。",
                LocalDate.of(2026, 8, 3)
        );

        assertThat(resolved).containsEntry("星期四", LocalDate.of(2026, 8, 6));
        assertThat(resolved).containsEntry("本周日", LocalDate.of(2026, 8, 9));
        assertThat(resolved).containsEntry("下周四", LocalDate.of(2026, 8, 13));
        assertThat(resolved).containsEntry("下下星期一", LocalDate.of(2026, 8, 17));
    }

    @Test
    void shouldUseTodayWhenWeekdayMatchesToday() {
        Map<String, LocalDate> resolved = resolver.resolveWeekdayMentions(
                "星期一上午九点签到",
                LocalDate.of(2026, 8, 3)
        );

        assertThat(resolved).containsEntry("星期一", LocalDate.of(2026, 8, 3));
    }

    @Test
    void shouldBuildPromptWithCurrentTimeAndResolvedDates() {
        String context = resolver.buildPromptContext("请于星期四下午两点开展活动");

        assertThat(context).contains("2026-08-03 12:30:00");
        assertThat(context).contains("“星期四” → 2026-08-06（星期四）");
        assertThat(context).contains("Asia/Shanghai");
    }
}
