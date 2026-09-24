-- Optional catalogue seed for a FRESH database after schema.sql.
-- No user accounts or historical records. No DROP, DELETE or UPDATE commands.
-- Existing primary keys are left untouched.

INSERT IGNORE INTO vehicle_brand (Brand_ID, Brand_Name) VALUES
(1, 'Toyota'),
(2, 'Honda'),
(3, 'Nissan'),
(4, 'Suzuki'),
(5, 'Mitsubishi');

INSERT IGNORE INTO vehicle_model (Model_ID, Brand_ID, Model_Name) VALUES
(1, 1, 'Corolla'),
(2, 1, 'Prius'),
(3, 1, 'Aqua'),
(4, 2, 'Civic'),
(5, 2, 'Vezel'),
(6, 2, 'Fit'),
(7, 3, 'Leaf'),
(8, 3, 'X-Trail'),
(9, 4, 'Wagon R'),
(10, 4, 'Alto'),
(11, 5, 'Lancer');

INSERT IGNORE INTO garage (Garage_ID, Garage_Name, Location, Specialization, Rating, Phone_No, latitude, longitude, is_demo) VALUES
(1, 'City Auto Care [Demo]', 'Hospital Road, Jaffna', 'Brakes, Suspension & Engine', 4.8, '+94 21 222 3456', 9.664500, 80.019500, 1),
(2, 'Express Hybrid Motors [Demo]', 'Kandy Road, Jaffna', 'Hybrid Systems, Electrical & Battery', 4.9, '+94 21 221 7890', 9.658000, 80.031000, 1),
(3, 'Northern Auto Diagnostics [Demo]', 'Palaly Road, Jaffna', 'Computer Diagnostics & Transmission', 4.7, '+94 21 222 9911', 9.672000, 80.023000, 1),
(4, 'Premier Vehicle Hospital [Demo]', 'Baseline Road, Colombo', 'Engine Overhaul & General Repair', 4.6, '+94 11 250 1234', 6.927100, 79.861200, 1),
(5, 'Lanka Quick Lube & Tires [Demo]', 'Galle Road, Colombo', 'Tires, Alignment & Oil Service', 4.5, '+94 11 258 5678', 6.892000, 79.855000, 1),
(6, 'DIMO - Diesel & Motor Engineering (Jaffna)', 'No. 09, A9 Road, Ariyalai, Jaffna', NULL, NULL, '+94 21 492 0515', 9.659719, 80.053703, 0),
(7, 'United Motors Lanka - Jaffna Workshop', 'A9 Road, Navatkuli, Jaffna 40000', 'Service & Spare Parts', NULL, '+94 214 924 259', 9.665360, 80.085220, 0);
