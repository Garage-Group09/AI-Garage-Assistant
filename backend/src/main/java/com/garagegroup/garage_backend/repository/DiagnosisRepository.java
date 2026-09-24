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

    /**
     * Returns the most recent completed DIAGNOSIS assessment for a specific vehicle belonging to a user.
     */
    @Query("SELECT d FROM Diagnosis d " +
           "JOIN Symptom s ON d.symptomId = s.symptomId " +
           "WHERE s.userId = :userId AND s.vehicleId = :vehicleId AND d.responseType = com.garagegroup.garage_backend.entity.Diagnosis.ResponseType.DIAGNOSIS " +
           "ORDER BY d.createdAt DESC")
    List<Diagnosis> findMostRecentDiagnosisByVehicle(@Param("userId") Integer userId, @Param("vehicleId") Integer vehicleId, Pageable pageable);

    /**
     * Returns the most recent completed DIAGNOSIS assessment for a user across all vehicles.
     */
    @Query("SELECT d FROM Diagnosis d " +
           "JOIN Symptom s ON d.symptomId = s.symptomId " +
           "WHERE s.userId = :userId AND d.responseType = com.garagegroup.garage_backend.entity.Diagnosis.ResponseType.DIAGNOSIS " +
           "ORDER BY d.createdAt DESC")
    List<Diagnosis> findMostRecentCompletedDiagnosisByUserId(@Param("userId") Integer userId, Pageable pageable);

    /**
     * Returns all diagnoses for a user ordered by createdAt DESC.
     */
    @Query("SELECT d FROM Diagnosis d " +
           "JOIN Symptom s ON d.symptomId = s.symptomId " +
           "WHERE s.userId = :userId " +
           "ORDER BY d.createdAt DESC")
    List<Diagnosis> findAllByUserId(@Param("userId") Integer userId);
    @Query("SELECT d FROM Diagnosis d JOIN Symptom s ON d.symptomId = s.symptomId " +
           "WHERE s.userId = :userId AND s.vehicleId = :vehicleId AND d.sessionId = :sessionId " +
           "AND d.responseType = com.garagegroup.garage_backend.entity.Diagnosis.ResponseType.DIAGNOSIS ORDER BY d.createdAt DESC")
    List<Diagnosis> findSessionDiagnosis(@Param("userId") Integer userId, @Param("vehicleId") Integer vehicleId,
        @Param("sessionId") String sessionId, Pageable pageable);
}
