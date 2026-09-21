-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 21, 2026 at 11:39 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `vehicle_diagnosis_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `chat_history`
--

CREATE TABLE `chat_history` (
  `Chat_ID` int(11) NOT NULL,
  `User_ID` int(11) NOT NULL,
  `Sender` enum('user','ai') NOT NULL,
  `Message` text NOT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `diagnosis`
--

CREATE TABLE `diagnosis` (
  `Diagnosis_ID` int(11) NOT NULL,
  `Symptom_ID` int(11) NOT NULL,
  `Fault_Name` varchar(150) NOT NULL,
  `Confidence_Level` decimal(5,2) NOT NULL,
  `Possible_Cause` varchar(255) DEFAULT NULL,
  `Safe_To_Drive` tinyint(1) DEFAULT NULL,
  `Min_Cost` decimal(10,2) DEFAULT NULL,
  `Max_Cost` decimal(10,2) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp(),
  `Model_Used` varchar(50) DEFAULT NULL COMMENT 'e.g. groq-gpt-oss-20b or naive_bayes'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `garage`
--

CREATE TABLE `garage` (
  `Garage_ID` int(11) NOT NULL,
  `Garage_Name` varchar(100) NOT NULL,
  `Location` varchar(150) DEFAULT NULL,
  `Specialization` varchar(100) DEFAULT NULL,
  `Rating` decimal(2,1) DEFAULT NULL,
  `Phone_No` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `garage_recommendation`
--

CREATE TABLE `garage_recommendation` (
  `Recommendation_ID` int(11) NOT NULL,
  `User_ID` int(11) NOT NULL,
  `Garage_ID` int(11) NOT NULL,
  `Distance` decimal(6,2) DEFAULT NULL,
  `Match_Score` decimal(5,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `symptom`
--

CREATE TABLE `symptom` (
  `Symptom_ID` int(11) NOT NULL,
  `Vehicle_ID` int(11) NOT NULL,
  `Description` text NOT NULL,
  `Reported_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `User_ID` int(11) NOT NULL,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(150) DEFAULT NULL,
  `Password` varchar(255) NOT NULL,
  `Is_Admin` tinyint(1) NOT NULL DEFAULT 0,
  `Contact_No` varchar(15) DEFAULT NULL,
  `Location` varchar(150) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`User_ID`, `Name`, `Email`, `Password`, `Is_Admin`, `Contact_No`, `Location`, `Created_At`) VALUES
(1, 'Test User', 'test@test.com', 'test123', 0, NULL, NULL, '2026-09-21 15:00:44'),
(3, 'Mohamed Isfak', 'isfak216@gmail.com', '123456', 0, NULL, NULL, '2026-09-21 15:00:44'),
(4, 'Mohamed Isfak', 'isfak349@gmail.com', '12345', 0, NULL, NULL, '2026-09-21 15:00:44');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle`
--

CREATE TABLE `vehicle` (
  `Vehicle_ID` int(11) NOT NULL,
  `User_ID` int(11) NOT NULL,
  `Model_ID` int(11) DEFAULT NULL,
  `Brand` varchar(50) DEFAULT NULL,
  `Fuel_Type` varchar(30) DEFAULT NULL,
  `Vehicle_Type` varchar(30) DEFAULT NULL,
  `Year` int(4) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle`
--

INSERT INTO `vehicle` (`Vehicle_ID`, `User_ID`, `Model_ID`, `Brand`, `Fuel_Type`, `Vehicle_Type`, `Year`, `Created_At`) VALUES
(2, 3, NULL, 'Honda', 'Petrol', 'Sedan', NULL, '2026-09-21 15:00:44');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_brand`
--

CREATE TABLE `vehicle_brand` (
  `Brand_ID` int(11) NOT NULL,
  `Brand_Name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle_brand`
--

INSERT INTO `vehicle_brand` (`Brand_ID`, `Brand_Name`) VALUES
(2, 'Honda'),
(5, 'Mitsubishi'),
(3, 'Nissan'),
(4, 'Suzuki'),
(1, 'Toyota');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_model`
--

CREATE TABLE `vehicle_model` (
  `Model_ID` int(11) NOT NULL,
  `Brand_ID` int(11) NOT NULL,
  `Model_Name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle_model`
--

INSERT INTO `vehicle_model` (`Model_ID`, `Brand_ID`, `Model_Name`) VALUES
(1, 1, 'Corolla'),
(2, 1, 'Aqua'),
(3, 1, 'Vitz'),
(4, 2, 'Civic'),
(5, 2, 'Vezel'),
(6, 2, 'Fit'),
(7, 3, 'Leaf'),
(8, 3, 'X-Trail'),
(9, 4, 'Alto'),
(10, 4, 'Wagon R'),
(11, 5, 'Lancer'),
(12, 5, 'Montero');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD PRIMARY KEY (`Chat_ID`),
  ADD KEY `User_ID` (`User_ID`);

--
-- Indexes for table `diagnosis`
--
ALTER TABLE `diagnosis`
  ADD PRIMARY KEY (`Diagnosis_ID`),
  ADD KEY `Symptom_ID` (`Symptom_ID`);

--
-- Indexes for table `garage`
--
ALTER TABLE `garage`
  ADD PRIMARY KEY (`Garage_ID`);

--
-- Indexes for table `garage_recommendation`
--
ALTER TABLE `garage_recommendation`
  ADD PRIMARY KEY (`Recommendation_ID`),
  ADD KEY `User_ID` (`User_ID`),
  ADD KEY `Garage_ID` (`Garage_ID`);

--
-- Indexes for table `symptom`
--
ALTER TABLE `symptom`
  ADD PRIMARY KEY (`Symptom_ID`),
  ADD KEY `Vehicle_ID` (`Vehicle_ID`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`User_ID`),
  ADD UNIQUE KEY `Email` (`Email`);

--
-- Indexes for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD PRIMARY KEY (`Vehicle_ID`),
  ADD KEY `User_ID` (`User_ID`),
  ADD KEY `vehicle_ibfk_2` (`Model_ID`);

--
-- Indexes for table `vehicle_brand`
--
ALTER TABLE `vehicle_brand`
  ADD PRIMARY KEY (`Brand_ID`),
  ADD UNIQUE KEY `Brand_Name` (`Brand_Name`);

--
-- Indexes for table `vehicle_model`
--
ALTER TABLE `vehicle_model`
  ADD PRIMARY KEY (`Model_ID`),
  ADD KEY `Brand_ID` (`Brand_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chat_history`
--
ALTER TABLE `chat_history`
  MODIFY `Chat_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `diagnosis`
--
ALTER TABLE `diagnosis`
  MODIFY `Diagnosis_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `garage`
--
ALTER TABLE `garage`
  MODIFY `Garage_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `garage_recommendation`
--
ALTER TABLE `garage_recommendation`
  MODIFY `Recommendation_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `symptom`
--
ALTER TABLE `symptom`
  MODIFY `Symptom_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `User_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `vehicle`
--
ALTER TABLE `vehicle`
  MODIFY `Vehicle_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `vehicle_brand`
--
ALTER TABLE `vehicle_brand`
  MODIFY `Brand_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `vehicle_model`
--
ALTER TABLE `vehicle_model`
  MODIFY `Model_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD CONSTRAINT `chat_history_ibfk_1` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE CASCADE;

--
-- Constraints for table `diagnosis`
--
ALTER TABLE `diagnosis`
  ADD CONSTRAINT `diagnosis_ibfk_1` FOREIGN KEY (`Symptom_ID`) REFERENCES `symptom` (`Symptom_ID`) ON DELETE CASCADE;

--
-- Constraints for table `garage_recommendation`
--
ALTER TABLE `garage_recommendation`
  ADD CONSTRAINT `garage_recommendation_ibfk_1` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `garage_recommendation_ibfk_2` FOREIGN KEY (`Garage_ID`) REFERENCES `garage` (`Garage_ID`) ON DELETE CASCADE;

--
-- Constraints for table `symptom`
--
ALTER TABLE `symptom`
  ADD CONSTRAINT `symptom_ibfk_1` FOREIGN KEY (`Vehicle_ID`) REFERENCES `vehicle` (`Vehicle_ID`) ON DELETE CASCADE;

--
-- Constraints for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD CONSTRAINT `vehicle_ibfk_1` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `vehicle_ibfk_2` FOREIGN KEY (`Model_ID`) REFERENCES `vehicle_model` (`Model_ID`);

--
-- Constraints for table `vehicle_model`
--
ALTER TABLE `vehicle_model`
  ADD CONSTRAINT `vehicle_model_ibfk_1` FOREIGN KEY (`Brand_ID`) REFERENCES `vehicle_brand` (`Brand_ID`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
