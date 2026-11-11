using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class MoveBookingFinancesToSharedItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_TripId",
                table: "Bookings");

            migrationBuilder.AddColumn<Guid>(
                name: "ItemCoreId",
                table: "Bookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Bookings" SET "ItemCoreId" = gen_random_uuid();

                INSERT INTO "ItemCores" ("Id", "TripId", "Revision", "CreatedAtUtc")
                SELECT "ItemCoreId", "TripId", gen_random_uuid(), "CreatedAtUtc"
                FROM "Bookings";

                INSERT INTO "ItemCosts" ("ItemCoreId", "Cost")
                SELECT "ItemCoreId", "TotalCost"
                FROM "Bookings";

                INSERT INTO "ItemPaymentTotals" ("ItemCoreId", "Paid", "Refunded")
                SELECT "ItemCoreId", "AmountPaid", COALESCE("AmountRefunded", 0)
                FROM "Bookings";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "ItemCoreId",
                table: "Bookings",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_ItemCoreId",
                table: "Bookings",
                column: "ItemCoreId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_TripId_ItemCoreId",
                table: "Bookings",
                columns: new[] { "TripId", "ItemCoreId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_ItemCores_TripId_ItemCoreId",
                table: "Bookings",
                columns: new[] { "TripId", "ItemCoreId" },
                principalTable: "ItemCores",
                principalColumns: new[] { "TripId", "Id" });

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_ItemCosts_ItemCoreId",
                table: "Bookings",
                column: "ItemCoreId",
                principalTable: "ItemCosts",
                principalColumn: "ItemCoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_ItemPaymentTotals_ItemCoreId",
                table: "Bookings",
                column: "ItemCoreId",
                principalTable: "ItemPaymentTotals",
                principalColumn: "ItemCoreId");

            migrationBuilder.DropColumn(
                name: "AmountPaid",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "AmountRefunded",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "TotalCost",
                table: "Bookings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_ItemCores_TripId_ItemCoreId",
                table: "Bookings");

            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_ItemCosts_ItemCoreId",
                table: "Bookings");

            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_ItemPaymentTotals_ItemCoreId",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_ItemCoreId",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_TripId_ItemCoreId",
                table: "Bookings");

            migrationBuilder.AddColumn<decimal>(
                name: "AmountPaid",
                table: "Bookings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AmountRefunded",
                table: "Bookings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalCost",
                table: "Bookings",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Bookings" AS booking
                SET "TotalCost" = cost."Cost",
                    "AmountPaid" = payment."Paid",
                    "AmountRefunded" = NULLIF(payment."Refunded", 0)
                FROM "ItemCosts" AS cost
                JOIN "ItemPaymentTotals" AS payment ON payment."ItemCoreId" = cost."ItemCoreId"
                WHERE booking."ItemCoreId" = cost."ItemCoreId";

                DELETE FROM "ItemCores" AS core
                USING "Bookings" AS booking
                WHERE core."Id" = booking."ItemCoreId";
                """);

            migrationBuilder.DropColumn(
                name: "ItemCoreId",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_TripId",
                table: "Bookings",
                column: "TripId");
        }
    }
}
