package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.Symptom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SymptomRepository extends JpaRepository<Symptom, Long> {

    List<Symptom> findByVehicleId(Integer vehicleId);
}
