ALTER TABLE `user_integration`
ADD COLUMN `externalUserId` text;

CREATE INDEX `user_integration_external_user_idx`
  ON `user_integration` (`externalUserId`);
