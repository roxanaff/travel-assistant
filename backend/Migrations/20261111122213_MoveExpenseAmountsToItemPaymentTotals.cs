using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class MoveExpenseAmountsToItemPaymentTotals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Expenses_TripId",
                table: "Expenses");

            migrationBuilder.AddColumn<Guid>(
                name: "ItemCoreId",
                table: "Expenses",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Expenses" AS expense
                SET "ItemCoreId" = plan."ItemCoreId"
                FROM "PlannedCosts" AS plan
                WHERE expense."PlannedCostId" = plan."Id";

                UPDATE "Expenses" SET "ItemCoreId" = gen_random_uuid()
                WHERE "PlannedCostId" IS NULL;

                INSERT INTO "ItemCores" ("Id", "TripId", "Revision", "CreatedAtUtc")
                SELECT "ItemCoreId", "TripId", gen_random_uuid(), "CreatedAtUtc"
                FROM "Expenses"
                WHERE "PlannedCostId" IS NULL;

                INSERT INTO "ItemPaymentTotals" ("ItemCoreId", "Paid", "Refunded")
                SELECT "ItemCoreId", "Amount", 0
                FROM "Expenses";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "ItemCoreId",
                table: "Expenses",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ItemCoreId",
                table: "Expenses",
                column: "ItemCoreId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TripId_ItemCoreId",
                table: "Expenses",
                columns: new[] { "TripId", "ItemCoreId" });

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_ItemCores_TripId_ItemCoreId",
                table: "Expenses",
                columns: new[] { "TripId", "ItemCoreId" },
                principalTable: "ItemCores",
                principalColumns: new[] { "TripId", "Id" });

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_ItemPaymentTotals_ItemCoreId",
                table: "Expenses",
                column: "ItemCoreId",
                principalTable: "ItemPaymentTotals",
                principalColumn: "ItemCoreId");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "Expenses");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_ItemCores_TripId_ItemCoreId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_ItemPaymentTotals_ItemCoreId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_ItemCoreId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_TripId_ItemCoreId",
                table: "Expenses");

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "Expenses",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Expenses" AS expense
                SET "Amount" = payment."Paid" - payment."Refunded"
                FROM "ItemPaymentTotals" AS payment
                WHERE payment."ItemCoreId" = expense."ItemCoreId";

                DELETE FROM "ItemPaymentTotals" AS payment
                USING "Expenses" AS expense
                WHERE payment."ItemCoreId" = expense."ItemCoreId";

                DELETE FROM "ItemCores" AS core
                USING "Expenses" AS expense
                WHERE core."Id" = expense."ItemCoreId"
                  AND NOT EXISTS (SELECT 1 FROM "PlannedCosts" AS plan WHERE plan."ItemCoreId" = core."Id");
                """);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "Expenses",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "ItemCoreId",
                table: "Expenses");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TripId",
                table: "Expenses",
                column: "TripId");
        }
    }
}
