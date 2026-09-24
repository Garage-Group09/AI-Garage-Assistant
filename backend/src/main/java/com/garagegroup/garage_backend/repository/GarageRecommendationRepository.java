package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.GarageRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageRecommendationRepository extends JpaRepository<GarageRecommendation, Long> {

    /** All recommendations ever generated for a specific user. */
    List<GarageRecommendation> findByUserId(Integer userId);
    java.util.Optional<GarageRecommendation> findFirstByUserIdAndGarageIdAndDiagnosisId(Integer userId, Integer garageId, Long diagnosisId);
}
