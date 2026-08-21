package com.xxx.campus.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.campus.security.BearerTokenAuthFilter;
import com.xxx.campus.security.OperationAuditFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Map;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final BearerTokenAuthFilter bearerTokenAuthFilter;
    private final OperationAuditFilter operationAuditFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public FilterRegistrationBean<OperationAuditFilter> operationAuditFilterRegistration(OperationAuditFilter filter) {
        FilterRegistrationBean<OperationAuditFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/wecom/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/system/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ai/images/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/activities/parse", "/api/activities/import-link").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/activities/import-link/config").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/ai/images/generate").authenticated()
                        .requestMatchers("/api/ai/settings/**", "/api/ai/image-settings/**").denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/student/activities/**").authenticated()
                        .requestMatchers("/api/student/**").hasRole("STUDENT")
                        .requestMatchers("/api/notification-groups/**").hasRole("PUBLISHER")
                        .requestMatchers(HttpMethod.GET, "/api/activities", "/api/activities/*")
                        .hasAnyRole("PUBLISHER", "COLLEGE_REVIEWER", "COLLEGE_LEADER")
                        .requestMatchers("/api/activities/**").hasRole("PUBLISHER")
                        .requestMatchers("/api/ai/**").denyAll()
                        .requestMatchers("/api/approvals/**")
                        .hasAnyRole("PUBLISHER", "COLLEGE_REVIEWER", "COLLEGE_LEADER")
                        .requestMatchers(HttpMethod.GET, "/api/audit-logs")
                        .hasAnyRole("COLLEGE_REVIEWER", "COLLEGE_LEADER")
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(401);
                            response.setCharacterEncoding("UTF-8");
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getOutputStream(), Map.of(
                                    "status", 401,
                                    "message", "登录状态已失效，请重新登录"
                            ));
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setCharacterEncoding("UTF-8");
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getOutputStream(), Map.of(
                                    "status", 403,
                                    "message", "当前账号没有权限执行此操作"
                            ));
                        }))
                .addFilterBefore(bearerTokenAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(operationAuditFilter, BearerTokenAuthFilter.class)
                .build();
    }
}
