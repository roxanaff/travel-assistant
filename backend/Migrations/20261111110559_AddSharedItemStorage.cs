using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AddSharedItemStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItemCores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripId = table.Column<Guid>(type: "uuid", nullable: false),
                    Revision = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemCores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemCores_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemCosts",
                columns: table => new
                {
                    ItemCoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Cost = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemCosts", x => x.ItemCoreId);
                    table.CheckConstraint("CK_ItemCosts_CostRange", "CAST(\"Cost\" AS numeric) BETWEEN 0 AND 999999999.99");
                    table.ForeignKey(
                        name: "FK_ItemCosts_ItemCores_ItemCoreId",
                        column: x => x.ItemCoreId,
                        principalTable: "ItemCores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemPaymentTotals",
                columns: table => new
                {
                    ItemCoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Paid = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Refunded = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemPaymentTotals", x => x.ItemCoreId);
                    table.CheckConstraint("CK_ItemPaymentTotals_PaidRange", "CAST(\"Paid\" AS numeric) BETWEEN 0 AND 999999999.99");
                    table.CheckConstraint("CK_ItemPaymentTotals_RefundedRange", "CAST(\"Refunded\" AS numeric) BETWEEN 0 AND CAST(\"Paid\" AS numeric)");
                    table.ForeignKey(
                        name: "FK_ItemPaymentTotals_ItemCores_ItemCoreId",
                        column: x => x.ItemCoreId,
                        principalTable: "ItemCores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemCoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FixedSlot = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    Location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    StartLocation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    EndLocation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemSchedules", x => x.Id);
                    table.CheckConstraint("CK_ItemSchedules_DurationWithoutEnd", "\"DurationMinutes\" IS NULL OR (\"DurationMinutes\" > 0 AND \"EndDate\" IS NULL AND \"EndTime\" IS NULL)");
                    table.CheckConstraint("CK_ItemSchedules_StartTimeRequiresDate", "\"StartTime\" IS NULL OR \"StartDate\" IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_ItemSchedules_ItemCores_ItemCoreId",
                        column: x => x.ItemCoreId,
                        principalTable: "ItemCores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItemCores_TripId",
                table: "ItemCores",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemSchedules_ItemCoreId_FixedSlot",
                table: "ItemSchedules",
                columns: new[] { "ItemCoreId", "FixedSlot" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItemCosts");

            migrationBuilder.DropTable(
                name: "ItemPaymentTotals");

            migrationBuilder.DropTable(
                name: "ItemSchedules");

            migrationBuilder.DropTable(
                name: "ItemCores");
        }
    }
}
