import { useState, useEffect } from "react";
import type { AFSC } from "@shared/types";

// Air Force Specialty Codes database
// In a real app, this would be fetched from an API
const AFSC_DATABASE: AFSC[] = [
  // 1XXXX - Operations
  { code: "1A0X1", title: "In-Flight Refueling", prefix: "1A" },
  { code: "1A1X1", title: "Flight Engineer", prefix: "1A" },
  { code: "1A2X1", title: "Aircraft Loadmaster", prefix: "1A" },
  { code: "1A3X1", title: "Airborne Mission Systems", prefix: "1A" },
  { code: "1A6X1", title: "Flight Attendant", prefix: "1A" },
  { code: "1A8X1", title: "Airborne Cryptologic Linguist", prefix: "1A" },
  { code: "1A8X2", title: "Airborne Intelligence, Surveillance and Reconnaissance", prefix: "1A" },
  { code: "1A9X1", title: "Special Mission Aviator", prefix: "1A" },
  
  // 1C - Command and Control Operations
  { code: "1C0X2", title: "Aviation Resource Management", prefix: "1C" },
  { code: "1C1X1", title: "Air Traffic Control", prefix: "1C" },
  { code: "1C3X1", title: "Command and Control Operations", prefix: "1C" },
  { code: "1C4X1", title: "Tactical Air Command and Control Party", prefix: "1C" },
  { code: "1C5X1", title: "Aerospace Control and Warning Systems", prefix: "1C" },
  { code: "1C6X1", title: "Space Systems Operations", prefix: "1C" },
  { code: "1C7X1", title: "Airfield Management", prefix: "1C" },
  
  // 1N - Intelligence
  { code: "1N0X1", title: "Operations Intelligence", prefix: "1N" },
  { code: "1N1X1", title: "Geospatial Intelligence", prefix: "1N" },
  { code: "1N2X1", title: "Signals Intelligence Analyst", prefix: "1N" },
  { code: "1N3X1", title: "Cryptologic Linguist", prefix: "1N" },
  { code: "1N4X1", title: "Network Intelligence Analyst", prefix: "1N" },
  
  // 2XXXX - Logistics
  { code: "2A0X1", title: "Avionics Test Station and Components", prefix: "2A" },
  { code: "2A2X1", title: "Electronic Warfare Systems", prefix: "2A" },
  { code: "2A2X2", title: "Electronic Countermeasures Systems", prefix: "2A" },
  { code: "2A2X3", title: "Radar and Warning Systems", prefix: "2A" },
  { code: "2A3X3", title: "Tactical Aircraft Maintenance", prefix: "2A" },
  { code: "2A5X1", title: "Airlift/Special Mission Aircraft Maintenance", prefix: "2A" },
  { code: "2A5X2", title: "Helicopter Maintenance", prefix: "2A" },
  { code: "2A5X3", title: "Integrated Avionics Systems", prefix: "2A" },
  { code: "2A5X4", title: "Refuel/Bomber Aircraft Maintenance", prefix: "2A" },
  { code: "2A6X1", title: "Aerospace Propulsion", prefix: "2A" },
  { code: "2A6X2", title: "Aircraft Electrical and Environmental Systems", prefix: "2A" },
  { code: "2A6X3", title: "Aerospace Ground Equipment", prefix: "2A" },
  { code: "2A6X4", title: "Aircraft Fuel Systems", prefix: "2A" },
  { code: "2A6X5", title: "Aircraft Hydraulic Systems", prefix: "2A" },
  { code: "2A6X6", title: "Aircraft Electrical and Environmental Systems", prefix: "2A" },
  { code: "2A7X1", title: "Aircraft Metals Technology", prefix: "2A" },
  { code: "2A7X2", title: "Nondestructive Inspection", prefix: "2A" },
  { code: "2A7X3", title: "Aircraft Structural Maintenance", prefix: "2A" },
  { code: "2A7X5", title: "Low Observable Aircraft Structural Maintenance", prefix: "2A" },
  { code: "2A8X1", title: "Mobility Air Forces Integrated Instrument and Flight Control Systems", prefix: "2A" },
  { code: "2A8X2", title: "Mobility Air Forces Integrated Communication/Navigation/Mission Systems", prefix: "2A" },
  { code: "2A9X1", title: "Bomber/Special Electronic Mission Aircraft Maintenance", prefix: "2A" },
  { code: "2A9X2", title: "Bomber/Special Integrated Communication/Navigation/Mission Systems", prefix: "2A" },
  { code: "2A9X3", title: "Bomber/Special Integrated Instrument and Flight Control Systems", prefix: "2A" },
  
  // 2F - Fuels
  { code: "2F0X1", title: "Fuels", prefix: "2F" },
  
  // 2M - Missile and Space Systems Maintenance
  { code: "2M0X1", title: "Missile and Space Systems Electronic Maintenance", prefix: "2M" },
  { code: "2M0X2", title: "Missile and Space Systems Maintenance", prefix: "2M" },
  { code: "2M0X3", title: "Missile and Space Facilities", prefix: "2M" },
  
  // 2R - Maintenance Management Systems
  { code: "2R0X1", title: "Maintenance Management Systems", prefix: "2R" },
  { code: "2R1X1", title: "Maintenance Management Production", prefix: "2R" },
  
  // 2S - Materiel Management
  { code: "2S0X1", title: "Materiel Management", prefix: "2S" },
  
  // 2T - Transportation and Vehicle Maintenance
  { code: "2T0X1", title: "Traffic Management", prefix: "2T" },
  { code: "2T1X1", title: "Vehicle Operations", prefix: "2T" },
  { code: "2T2X1", title: "Air Transportation", prefix: "2T" },
  { code: "2T3X1", title: "Motor Vehicle Maintenance", prefix: "2T" },
  { code: "2T3X2", title: "Special Purpose Vehicle and Equipment Maintenance", prefix: "2T" },
  { code: "2T3X5", title: "Vehicle Management and Analysis", prefix: "2T" },
  { code: "2T3X7", title: "Transient Alert", prefix: "2T" },
  
  // 2W - Munitions and Weapons Systems
  { code: "2W0X1", title: "Munitions Systems", prefix: "2W" },
  { code: "2W1X1", title: "Aircraft Armament Systems", prefix: "2W" },
  { code: "2W2X1", title: "Nuclear Weapons", prefix: "2W" },
  
  // 3XXXX - Support
  { code: "3D0X1", title: "Knowledge Management", prefix: "3D" },
  { code: "3D0X2", title: "Cyber Transport Systems", prefix: "3D" },
  { code: "3D0X3", title: "Cyber Surety", prefix: "3D" },
  { code: "3D0X4", title: "Computer Systems Programming", prefix: "3D" },
  { code: "3D1X1", title: "Client Systems", prefix: "3D" },
  { code: "3D1X2", title: "Cyber Transport Systems", prefix: "3D" },
  { code: "3D1X3", title: "Radio Frequency Transmission Systems", prefix: "3D" },
  { code: "3D1X4", title: "Spectrum Operations", prefix: "3D" },
  { code: "3D1X7", title: "Cable and Antenna Systems", prefix: "3D" },
  
  // 3E - Civil Engineering
  { code: "3E0X1", title: "Electrical Systems", prefix: "3E" },
  { code: "3E0X2", title: "Electrical Power Production", prefix: "3E" },
  { code: "3E1X1", title: "Heating, Ventilation, Air Conditioning, and Refrigeration", prefix: "3E" },
  { code: "3E2X1", title: "Pavement and Construction Equipment", prefix: "3E" },
  { code: "3E3X1", title: "Structural", prefix: "3E" },
  { code: "3E4X1", title: "Utilities Systems", prefix: "3E" },
  { code: "3E4X3", title: "Environmental", prefix: "3E" },
  { code: "3E5X1", title: "Engineering", prefix: "3E" },
  { code: "3E6X1", title: "Operations Management", prefix: "3E" },
  { code: "3E7X1", title: "Fire Protection", prefix: "3E" },
  { code: "3E8X1", title: "Explosive Ordnance Disposal", prefix: "3E" },
  { code: "3E9X1", title: "Emergency Management", prefix: "3E" },
  
  // 3F - Force Support
  { code: "3F0X1", title: "Personnel", prefix: "3F" },
  { code: "3F1X1", title: "Services", prefix: "3F" },
  { code: "3F2X1", title: "Education and Training", prefix: "3F" },
  { code: "3F3X1", title: "Readiness", prefix: "3F" },
  { code: "3F4X1", title: "Equal Opportunity", prefix: "3F" },
  { code: "3F5X1", title: "Administration", prefix: "3F" },
  
  // 3M - Services
  { code: "3M0X1", title: "Services", prefix: "3M" },
  
  // 3N - Public Affairs
  { code: "3N0X1", title: "Public Affairs", prefix: "3N" },
  { code: "3N0X2", title: "Radio and Television Production", prefix: "3N" },
  { code: "3N0X5", title: "Photojournalist", prefix: "3N" },
  
  // 3P - Security Forces
  { code: "3P0X1", title: "Security Forces", prefix: "3P" },
  
  // 3S - Mission Support
  { code: "3S0X1", title: "Personnel", prefix: "3S" },
  
  // 4XXXX - Medical
  { code: "4A0X1", title: "Aerospace Medicine", prefix: "4A" },
  { code: "4A1X1", title: "Medical Materiel", prefix: "4A" },
  { code: "4A2X1", title: "Biomedical Equipment", prefix: "4A" },
  
  // 4B - Medical Support
  { code: "4B0X1", title: "Bioenvironmental Engineering", prefix: "4B" },
  
  // 4C - Mental Health
  { code: "4C0X1", title: "Mental Health Service", prefix: "4C" },
  
  // 4D - Medical Operations
  { code: "4D0X1", title: "Diet Therapy", prefix: "4D" },
  
  // 4E - Public Health
  { code: "4E0X1", title: "Public Health", prefix: "4E" },
  
  // 4H - Cardiopulmonary Laboratory
  { code: "4H0X1", title: "Cardiopulmonary Laboratory", prefix: "4H" },
  
  // 4J - Physical Medicine
  { code: "4J0X2", title: "Physical Medicine", prefix: "4J" },
  
  // 4M - Medical Operations
  { code: "4M0X1", title: "Aerospace Physiology", prefix: "4M" },
  
  // 4N - Medical Operations
  { code: "4N0X1", title: "Aerospace Medical Service", prefix: "4N" },
  { code: "4N1X1", title: "Surgical Service", prefix: "4N" },
  
  // 4P - Pharmacy
  { code: "4P0X1", title: "Pharmacy", prefix: "4P" },
  
  // 4R - Diagnostic Imaging
  { code: "4R0X1", title: "Diagnostic Imaging", prefix: "4R" },
  
  // 4T - Medical Laboratory
  { code: "4T0X1", title: "Medical Laboratory", prefix: "4T" },
  { code: "4T0X2", title: "Histopathology", prefix: "4T" },
  
  // 4V - Opticianry
  { code: "4V0X1", title: "Opticianry", prefix: "4V" },
  
  // 4Y - Dental
  { code: "4Y0X1", title: "Dental Assistant", prefix: "4Y" },
  { code: "4Y0X2", title: "Dental Laboratory", prefix: "4Y" },
];

export function useAfscs() {
  const [loading, setLoading] = useState(false);

  // Get filtered AFSCs by prefix
  const getFilteredAfscs = (prefix: string): AFSC[] => {
    if (!prefix) return [];
    
    // Handle different prefix formats
    let searchPrefix = prefix.toUpperCase();
    if (searchPrefix.includes('X')) {
      // Handle formats like "1XXXX" -> look for "1A", "1B", etc.
      searchPrefix = searchPrefix.charAt(0);
    }
    
    return AFSC_DATABASE.filter(afsc => 
      afsc.prefix.startsWith(searchPrefix) || 
      afsc.code.startsWith(searchPrefix)
    );
  };

  // Get AFSC by code
  const getAfscByCode = (code: string): AFSC | undefined => {
    return AFSC_DATABASE.find(afsc => afsc.code === code.toUpperCase());
  };

  // Search AFSCs by title
  const searchAfscsByTitle = (query: string): AFSC[] => {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase();
    return AFSC_DATABASE.filter(afsc => 
      afsc.title.toLowerCase().includes(searchTerm) ||
      afsc.code.toLowerCase().includes(searchTerm)
    );
  };

  // Get all unique prefixes
  const getAllPrefixes = (): string[] => {
    const prefixes = new Set(AFSC_DATABASE.map(afsc => afsc.prefix));
    return Array.from(prefixes).sort();
  };

  return {
    getFilteredAfscs,
    getAfscByCode,
    searchAfscsByTitle,
    getAllPrefixes,
    loading,
  };
}