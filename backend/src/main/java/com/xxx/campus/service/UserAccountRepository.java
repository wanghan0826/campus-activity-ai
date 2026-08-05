package com.xxx.campus.service;

import com.xxx.campus.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsernameIgnoreCase(String username);

    Optional<UserAccount> findByUserId(String userId);
}
