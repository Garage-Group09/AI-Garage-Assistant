package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.VehicleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleModelRepository extends JpaRepository<VehicleModel, Integer> {
    /** Returns all models belonging to a specific brand. */
    List<VehicleModel> findByBrandId(Integer brandId);
}
