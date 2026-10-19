using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class LinkBookingsDirectlyToExpenses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PlannedCosts_Bookings_BookingId",
                table: "PlannedCosts");

            migrationBuilder.DropIndex(
                name: "IX_PlannedCosts_BookingId",
                table: "PlannedCosts");

            migrationBuilder.AddColumn<Guid>(
                name: "BookingId",
                table: "Expenses",
                type: "uuid",
                nullable: true);

            // Preserve both records while moving the booking relationship to the expense.
            migrationBuilder.Sql("""
                UPDATE "Expenses"
                SET "BookingId" = (
                    SELECT "BookingId"
                    FROM "PlannedCosts"
                    WHERE "PlannedCosts"."Id" = "Expenses"."PlannedCostId"
                )
                WHERE "PlannedCostId" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "BookingId",
                table: "PlannedCosts");

            migrationBuilder.DropColumn(
                name: "HasPendingDeletedBookingNotice",
                table: "PlannedCosts");

            migrationBuilder.DropColumn(
                name: "HasPendingDeletedPlannedCostNotice",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_BookingId",
                table: "Expenses",
                column: "BookingId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Bookings_BookingId",
                table: "Expenses",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_Bookings_BookingId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_BookingId",
                table: "Expenses");

            migrationBuilder.AddColumn<Guid>(
                name: "BookingId",
                table: "PlannedCosts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasPendingDeletedBookingNotice",
                table: "PlannedCosts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasPendingDeletedPlannedCostNotice",
                table: "Bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("""
                UPDATE "PlannedCosts"
                SET "BookingId" = (
                    SELECT "BookingId"
                    FROM "Expenses"
                    WHERE "Expenses"."PlannedCostId" = "PlannedCosts"."Id"
                );
                """);

            migrationBuilder.DropColumn(
                name: "BookingId",
                table: "Expenses");

            migrationBuilder.CreateIndex(
                name: "IX_PlannedCosts_BookingId",
                table: "PlannedCosts",
                column: "BookingId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PlannedCosts_Bookings_BookingId",
                table: "PlannedCosts",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
