package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {

    List<ChatHistory> findByUserIdOrderByCreatedAtAsc(Integer userId);

    List<ChatHistory> findByUserIdAndVehicleIdOrderByCreatedAtAsc(Integer userId, Integer vehicleId);
    List<ChatHistory> findByUserIdAndVehicleIdAndSessionIdOrderByCreatedAtAsc(Integer userId, Integer vehicleId, String sessionId);
}
