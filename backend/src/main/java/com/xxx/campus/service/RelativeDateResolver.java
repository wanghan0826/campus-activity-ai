package com.xxx.campus.service;

import org.springframework.stereotype.Component;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 为 AI 提供确定性的中国时区日期上下文，并把公文中的星期表达预先换算为日期。
 */
@Component
public class RelativeDateResolver {

    static final ZoneId CHINA_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss EEEE", Locale.CHINA);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final Pattern WEEKDAY_PATTERN = Pattern.compile(
            "(?:(本|这|下下|下)(?:周|星期)|(周|星期))([一二三四五六日天])"
    );
    private static final Map<String, DayOfWeek> DAY_OF_WEEK_MAP = Map.of(
            "一", DayOfWeek.MONDAY,
            "二", DayOfWeek.TUESDAY,
            "三", DayOfWeek.WEDNESDAY,
            "四", DayOfWeek.THURSDAY,
            "五", DayOfWeek.FRIDAY,
            "六", DayOfWeek.SATURDAY,
            "日", DayOfWeek.SUNDAY,
            "天", DayOfWeek.SUNDAY
    );

    private final Clock clock;

    public RelativeDateResolver() {
        this(Clock.system(CHINA_ZONE));
    }

    RelativeDateResolver(Clock clock) {
        this.clock = clock;
    }

    public String buildPromptContext(String document) {
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(CHINA_ZONE);
        StringBuilder context = new StringBuilder()
                .append("当前中国标准时间：")
                .append(now.format(DATE_TIME_FORMATTER))
                .append("（时区 Asia/Shanghai）。");

        Map<String, LocalDate> resolvedMentions = resolveWeekdayMentions(document, now.toLocalDate());
        if (!resolvedMentions.isEmpty()) {
            context.append("\n原文中的星期表达已预换算如下：");
            resolvedMentions.forEach((mention, date) -> context
                    .append("\n- “")
                    .append(mention)
                    .append("” → ")
                    .append(date.format(DATE_FORMATTER))
                    .append("（")
                    .append(chineseWeekday(date.getDayOfWeek()))
                    .append("）"));
        }
        return context.toString();
    }

    Map<String, LocalDate> resolveWeekdayMentions(String document, LocalDate today) {
        Map<String, LocalDate> resolved = new LinkedHashMap<>();
        if (document == null || document.isBlank()) return resolved;

        Matcher matcher = WEEKDAY_PATTERN.matcher(document);
        while (matcher.find()) {
            String mention = matcher.group();
            String weekPrefix = matcher.group(1);
            DayOfWeek targetDay = DAY_OF_WEEK_MAP.get(matcher.group(3));
            resolved.putIfAbsent(mention, resolveDate(today, targetDay, weekPrefix));
        }
        return resolved;
    }

    private LocalDate resolveDate(LocalDate today, DayOfWeek targetDay, String weekPrefix) {
        if (weekPrefix == null) {
            return today.with(TemporalAdjusters.nextOrSame(targetDay));
        }

        LocalDate currentWeekMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int weeksToAdd = switch (weekPrefix) {
            case "下" -> 1;
            case "下下" -> 2;
            default -> 0;
        };
        return currentWeekMonday.plusWeeks(weeksToAdd).plusDays(targetDay.getValue() - 1L);
    }

    private String chineseWeekday(DayOfWeek dayOfWeek) {
        return "星期" + switch (dayOfWeek) {
            case MONDAY -> "一";
            case TUESDAY -> "二";
            case WEDNESDAY -> "三";
            case THURSDAY -> "四";
            case FRIDAY -> "五";
            case SATURDAY -> "六";
            case SUNDAY -> "日";
        };
    }
}
