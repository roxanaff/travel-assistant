using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class FixLegacyItineraryData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Map values stored by the previous category enum to the agreed new set.
            migrationBuilder.Sql("""
                UPDATE "ItineraryItems"
                SET "Category" = CASE "Category"
                    WHEN 'Sightseeing' THEN 'Attraction'
                    WHEN 'FoodAndDrink' THEN 'Food'
                    WHEN 'Transport' THEN 'Other'
                    WHEN 'Activity' THEN 'Other'
                    ELSE "Category"
                END;
                """);

            // The prior migration renamed EndTime to OpeningTime. Recover a duration
            // where possible, then clear the incorrectly repurposed opening-time value.
            migrationBuilder.Sql("""
                UPDATE "ItineraryItems"
                SET "DurationMinutes" = ROUND(
                    EXTRACT(EPOCH FROM ("OpeningTime" - "StartTime")) / 60
                )::integer
                WHERE "StartTime" IS NOT NULL
                    AND "OpeningTime" IS NOT NULL
                    AND "OpeningTime" >= "StartTime";

                UPDATE "ItineraryItems"
                SET "OpeningTime" = NULL;
                """);

            // Existing rows received the migration's temporary empty-string default.
            migrationBuilder.Sql("""
                UPDATE "ItineraryItems"
                SET "Priority" = 'WouldLikeToDo'
                WHERE "Priority" = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Legacy category and timing information cannot be reconstructed safely.
        }
    }
}
