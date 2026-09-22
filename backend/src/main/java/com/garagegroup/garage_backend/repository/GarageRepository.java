package com.garagegroup.garage_backend.repository;

import com.garagegroup.garage_backend.entity.Garage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Integer> {
    /** Returns all garages in a specific location (case-insensitive). */
    List<Garage> findByLocationContainingIgnoreCase(String location);
}
