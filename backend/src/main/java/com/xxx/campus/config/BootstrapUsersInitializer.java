package com.xxx.campus.config;

import com.xxx.campus.model.UserAccount;
import com.xxx.campus.service.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 本地原型的初始账号。生产环境接入学校认证后应关闭。 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "auth.bootstrap.enabled", havingValue = "true", matchIfMissing = true)
public class BootstrapUsersInitializer implements ApplicationRunner {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${auth.bootstrap.publisher-password:123456}")
    private String publisherPassword;

    @Value("${auth.bootstrap.reviewer-password:123456}")
    private String reviewerPassword;

    @Value("${auth.bootstrap.leader-password:123456}")
    private String leaderPassword;

    @Value("${auth.bootstrap.student-password:123456}")
    private String studentPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        createIfMissing("publisher", publisherPassword, "test_teacher_001", "活动发布人", "PUBLISHER");
        createIfMissing("reviewer", reviewerPassword, "review_teacher_001", "学院审核老师", "COLLEGE_REVIEWER");
        createIfMissing("leader", leaderPassword, "college_leader_001", "学院领导", "COLLEGE_LEADER");
        createIfMissing("student", studentPassword, "student_001", "学生用户", "STUDENT");
    }

    private void createIfMissing(String username, String password, String userId, String displayName, String role) {
        if (userAccountRepository.findByUsernameIgnoreCase(username).isPresent()) return;
        userAccountRepository.save(UserAccount.builder()
                .userId(userId)
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .displayName(displayName)
                .role(role)
                .collegeCode("INFORMATION_ENGINEERING")
                .collegeName("信息工程学院")
                .authSource("LOCAL")
                .enabled(true)
                .build());
    }
}
