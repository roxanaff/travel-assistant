using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class MovePlannedCostAmountsToItemCosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlannedCosts_TripId",
                table: "PlannedCosts");

            migrationBuilder.DropIndex(
                name: "IX_ItemCores_TripId",
                table: "ItemCores");

            migrationBuilder.AddColumn<Guid>(
                name: "ItemCoreId",
                table: "PlannedCosts",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "PlannedCosts" SET "ItemCoreId" = gen_random_uuid();

                INSERT INTO "ItemCores" ("Id", "TripId", "Revision", "CreatedAtUtc")
                SELECT "ItemCoreId", "TripId", gen_random_uuid(), "CreatedAtUtc"
                FROM "PlannedCosts";

                INSERT INTO "ItemCosts" ("ItemCoreId", "Cost")
                SELECT "ItemCoreId", "Amount"
                FROM "PlannedCosts";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "ItemCoreId",
                table: "PlannedCosts",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_ItemCores_TripId_Id",
                table: "ItemCores",
                columns: new[] { "TripId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_PlannedCosts_ItemCoreId",
                table: "PlannedCosts",
                column: "ItemCoreId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlannedCosts_TripId_ItemCoreId",
                table: "PlannedCosts",
                columns: new[] { "TripId", "ItemCoreId" });

            migrationBuilder.AddForeignKey(
                name: "FK_PlannedCosts_ItemCores_TripId_ItemCoreId",
                table: "PlannedCosts",
                columns: new[] { "TripId", "ItemCoreId" },
                principalTable: "ItemCores",
                principalColumns: new[] { "TripId", "Id" });

            migrationBuilder.AddForeignKey(
                name: "FK_PlannedCosts_ItemCosts_ItemCoreId",
                table: "PlannedCosts",
                column: "ItemCoreId",
                principalTable: "ItemCosts",
                principalColumn: "ItemCoreId");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "PlannedCosts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PlannedCosts_ItemCores_TripId_ItemCoreId",
                table: "PlannedCosts");

            migrationBuilder.DropForeignKey(
                name: "FK_PlannedCosts_ItemCosts_ItemCoreId",
                table: "PlannedCosts");

            migrationBuilder.DropIndex(
                name: "IX_PlannedCosts_ItemCoreId",
                table: "PlannedCosts");

            migrationBuilder.DropIndex(
                name: "IX_PlannedCosts_TripId_ItemCoreId",
                table: "PlannedCosts");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_ItemCores_TripId_Id",
                table: "ItemCores");

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "PlannedCosts",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "PlannedCosts" AS plan
                SET "Amount" = cost."Cost"
                FROM "ItemCosts" AS cost
                WHERE cost."ItemCoreId" = plan."ItemCoreId";

                DELETE FROM "ItemCores" AS core
                USING "PlannedCosts" AS plan
                WHERE core."Id" = plan."ItemCoreId";
                """);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "PlannedCosts",
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
                table: "PlannedCosts");

            migrationBuilder.CreateIndex(
                name: "IX_PlannedCosts_TripId",
                table: "PlannedCosts",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCores_TripId",
                table: "ItemCores",
                column: "TripId");
        }
    }
}
