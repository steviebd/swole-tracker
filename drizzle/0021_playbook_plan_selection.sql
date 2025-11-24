-- Add hasAiPlan field to playbooks table
ALTER TABLE `playbook` ADD `has_ai_plan` integer DEFAULT false;

-- Add activePlanType field to playbook_session table  
ALTER TABLE `playbook_session` ADD `active_plan_type` text DEFAULT 'algorithmic' NOT NULL;