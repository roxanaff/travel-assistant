using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AddBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.AddColumn<Guid>(
                name: "BookingId",
                table: "ItineraryItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "BookingRequired",
                table: "ItineraryItems",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BookingRole",
                table: "ItineraryItems",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasPendingDeletedBookingNotice",
                table: "ItineraryItems",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasPendingDeletedBookingNotice",
                table: "Expenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Provider = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ConfirmationNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    StartLocation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    EndLocation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ReturnStartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ReturnStartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    ReturnStartLocation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ReturnEndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ReturnEndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    ReturnEndLocation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ExternalLink = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TotalCost = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    AmountPaid = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false, defaultValue: 0m),
                    AmountRefunded = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    HasPendingDeletedActivityNotice = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    HasPendingDeletedPlannedCostNotice = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    HasPendingDeletedExpenseNotice = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bookings_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlannedCosts_BookingId",
                table: "PlannedCosts",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItineraryItems_BookingId",
                table: "ItineraryItems",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_TripId",
                table: "Bookings",
                column: "TripId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItineraryItems_Bookings_BookingId",
                table: "ItineraryItems",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PlannedCosts_Bookings_BookingId",
                table: "PlannedCosts",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItineraryItems_Bookings_BookingId",
                table: "ItineraryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PlannedCosts_Bookings_BookingId",
                table: "PlannedCosts");

            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_PlannedCosts_BookingId",
                table: "PlannedCosts");

            migrationBuilder.DropIndex(
                name: "IX_ItineraryItems_BookingId",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "BookingId",
                table: "PlannedCosts");

            migrationBuilder.DropColumn(
                name: "HasPendingDeletedBookingNotice",
                table: "PlannedCosts");

            migrationBuilder.DropColumn(
                name: "BookingId",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "BookingRequired",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "BookingRole",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "HasPendingDeletedBookingNotice",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "HasPendingDeletedBookingNotice",
                table: "Expenses");
        }
    }
}
