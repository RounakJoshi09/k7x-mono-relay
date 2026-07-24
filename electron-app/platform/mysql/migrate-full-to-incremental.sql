-- =============================================================================
-- MySQL: Upgrade existing FULL-sync schema to INCREMENTAL-sync (non-destructive)
-- =============================================================================
-- Safe to run on a database that already has data.
-- - Creates missing helper tables: _diff, _delete, _vchnumber
-- - Adds missing incremental columns (alterid, _parent, _ledger, etc.)
-- - Does NOT drop tables or delete rows
-- - Idempotent: safe to re-run
--
-- Usage (on the server / via SSH tunnel):
--   mysql -u root -p tally < migrate-full-to-incremental.sql
--   -- or paste/run this entire script in MySQL Workbench / phpMyAdmin
--
-- If your database name is not "tally", change the USE line below.
-- =============================================================================

USE tally;

-- ---------------------------------------------------------------------------
-- 1) Helper tables required only by incremental sync
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS _diff (
  guid varchar(64) not null,
  alterid int not null
);

CREATE TABLE IF NOT EXISTS _delete (
  guid varchar(64) not null
);

CREATE TABLE IF NOT EXISTS _vchnumber (
  guid varchar(64) not null,
  voucher_number varchar(256) not null
);

CREATE TABLE IF NOT EXISTS config (
  name varchar(64) not null primary key,
  value varchar(1024)
);

-- ---------------------------------------------------------------------------
-- 2) Add incremental columns only when missing (no data loss)
--    Uses prepared statements so this works without DELIMITER / procedures.
-- ---------------------------------------------------------------------------

-- mst_attendance_type.alterid
SET @__tbl = 'mst_attendance_type';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_attendance_type._parent
SET @__tbl = 'mst_attendance_type';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_attendance_type._uom
SET @__tbl = 'mst_attendance_type';
SET @__col = '_uom';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_cost_category.alterid
SET @__tbl = 'mst_cost_category';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_cost_centre.alterid
SET @__tbl = 'mst_cost_centre';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_cost_centre._parent
SET @__tbl = 'mst_cost_centre';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_employee.alterid
SET @__tbl = 'mst_employee';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_employee._parent
SET @__tbl = 'mst_employee';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_godown.alterid
SET @__tbl = 'mst_godown';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_godown._parent
SET @__tbl = 'mst_godown';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_group.alterid
SET @__tbl = 'mst_group';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_group._parent
SET @__tbl = 'mst_group';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_gst_effective_rate._item
SET @__tbl = 'mst_gst_effective_rate';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_ledger.alterid
SET @__tbl = 'mst_ledger';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_ledger._parent
SET @__tbl = 'mst_ledger';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_opening_batch_allocation._item
SET @__tbl = 'mst_opening_batch_allocation';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_opening_batch_allocation._godown
SET @__tbl = 'mst_opening_batch_allocation';
SET @__col = '_godown';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_opening_bill_allocation._ledger
SET @__tbl = 'mst_opening_bill_allocation';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_payhead.alterid
SET @__tbl = 'mst_payhead';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_payhead._parent
SET @__tbl = 'mst_payhead';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stock_group.alterid
SET @__tbl = 'mst_stock_group';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stock_group._parent
SET @__tbl = 'mst_stock_group';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stock_item.alterid
SET @__tbl = 'mst_stock_item';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stock_item._parent
SET @__tbl = 'mst_stock_item';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stock_item._uom
SET @__tbl = 'mst_stock_item';
SET @__col = '_uom';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stock_item._alternate_uom
SET @__tbl = 'mst_stock_item';
SET @__col = '_alternate_uom';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stockitem_standard_cost._item
SET @__tbl = 'mst_stockitem_standard_cost';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_stockitem_standard_price._item
SET @__tbl = 'mst_stockitem_standard_price';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_uom.alterid
SET @__tbl = 'mst_uom';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_vouchertype.alterid
SET @__tbl = 'mst_vouchertype';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- mst_vouchertype._parent
SET @__tbl = 'mst_vouchertype';
SET @__col = '_parent';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_accounting._ledger
SET @__tbl = 'trn_accounting';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_attendance._employee_name
SET @__tbl = 'trn_attendance';
SET @__col = '_employee_name';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_attendance._attendancetype_name
SET @__tbl = 'trn_attendance';
SET @__col = '_attendancetype_name';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_bank._ledger
SET @__tbl = 'trn_bank';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_batch._item
SET @__tbl = 'trn_batch';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_batch._godown
SET @__tbl = 'trn_batch';
SET @__col = '_godown';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_batch._destination_godown
SET @__tbl = 'trn_batch';
SET @__col = '_destination_godown';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_bill._ledger
SET @__tbl = 'trn_bill';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_closingstock_ledger._ledger
SET @__tbl = 'trn_closingstock_ledger';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_category_centre._ledger
SET @__tbl = 'trn_cost_category_centre';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_category_centre._costcategory
SET @__tbl = 'trn_cost_category_centre';
SET @__col = '_costcategory';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_category_centre._costcentre
SET @__tbl = 'trn_cost_category_centre';
SET @__col = '_costcentre';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_centre._ledger
SET @__tbl = 'trn_cost_centre';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_centre._costcentre
SET @__tbl = 'trn_cost_centre';
SET @__col = '_costcentre';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_inventory_category_centre._ledger
SET @__tbl = 'trn_cost_inventory_category_centre';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_inventory_category_centre._item
SET @__tbl = 'trn_cost_inventory_category_centre';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_inventory_category_centre._costcategory
SET @__tbl = 'trn_cost_inventory_category_centre';
SET @__col = '_costcategory';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_cost_inventory_category_centre._costcentre
SET @__tbl = 'trn_cost_inventory_category_centre';
SET @__col = '_costcentre';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_employee._category
SET @__tbl = 'trn_employee';
SET @__col = '_category';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_employee._employee_name
SET @__tbl = 'trn_employee';
SET @__col = '_employee_name';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_inventory._item
SET @__tbl = 'trn_inventory';
SET @__col = '_item';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_inventory._godown
SET @__tbl = 'trn_inventory';
SET @__col = '_godown';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_inventory_accounting._ledger
SET @__tbl = 'trn_inventory_accounting';
SET @__col = '_ledger';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_payhead._category
SET @__tbl = 'trn_payhead';
SET @__col = '_category';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_payhead._employee_name
SET @__tbl = 'trn_payhead';
SET @__col = '_employee_name';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_payhead._payhead_name
SET @__tbl = 'trn_payhead';
SET @__col = '_payhead_name';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_voucher.alterid
SET @__tbl = 'trn_voucher';
SET @__col = 'alterid';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'int not null default 0')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_voucher._voucher_type
SET @__tbl = 'trn_voucher';
SET @__col = '_voucher_type';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- trn_voucher._party_name
SET @__tbl = 'trn_voucher';
SET @__col = '_party_name';
SET @__ddl = (
  SELECT IF(
    (SELECT COUNT(*)
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = @__tbl) = 0,
    'SELECT 1',
    IF(
      (SELECT COUNT(*)
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = @__tbl
         AND column_name = @__col) > 0,
      'SELECT 1',
      CONCAT('ALTER TABLE `', @__tbl, '` ADD COLUMN `', @__col, '` ', 'varchar(64) not null default ''''')
    )
  )
);
PREPARE __stmt FROM @__ddl;
EXECUTE __stmt;
DEALLOCATE PREPARE __stmt;

-- ---------------------------------------------------------------------------
-- 3) Quick verification
-- ---------------------------------------------------------------------------
SELECT 'helper tables' AS check_type, table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('_diff', '_delete', '_vchnumber', 'config')
ORDER BY table_name;

SELECT table_name, column_name, column_type, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND column_name = 'alterid'
ORDER BY table_name, column_name;

SELECT 'Migration complete. Existing data was preserved.' AS status;
