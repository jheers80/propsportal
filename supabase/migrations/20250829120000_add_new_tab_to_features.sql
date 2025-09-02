-- Migration: Add new_tab column to features table
ALTER TABLE features ADD COLUMN new_tab BOOLEAN DEFAULT FALSE;
