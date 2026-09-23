package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.Diagnosis;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagnosisRepository extends JpaRepository<Diagnosis, Long> {

    List<Diagnosis> findBySymptomId(Long symptomId);

    /**
     * Returns the most recent Diagnosis for a user resolved through Symptom.userId.
     * Pass PageRequest.of(0, 1) to get exactly one result without SQL LIMIT.
     */
    @Query("SELECT d FROM Diagnosis d " +
           "JOIN Symptom s ON d.symptomId = s.symptomId " +
           "WHERE s.userId = :userId " +
           "ORDER BY d.createdAt DESC")
    List<Diagnosis> findMostRecentByUserId(@Param("userId") Integer userId, Pageable pageable);
}
