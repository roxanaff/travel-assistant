using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class RenameBookingTypeToCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Type",
                table: "Bookings",
                newName: "Category");

            migrationBuilder.Sql(
                "UPDATE \"Bookings\" SET \"Category\" = 'RailBusFerry' WHERE \"Category\" = 'TrainBusFerry';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Bookings\" SET \"Category\" = 'TrainBusFerry' WHERE \"Category\" = 'RailBusFerry';");

            migrationBuilder.RenameColumn(
                name: "Category",
                table: "Bookings",
                newName: "Type");
        }
    }
}
