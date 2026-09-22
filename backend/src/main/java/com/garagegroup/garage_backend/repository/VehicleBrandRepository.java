package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.VehicleBrand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleBrandRepository extends JpaRepository<VehicleBrand, Integer> {
    Optional<VehicleBrand> findByBrandNameIgnoreCase(String brandName);
    boolean existsByBrandNameIgnoreCase(String brandName);
}
