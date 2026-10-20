using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AddLinkedRecordReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LinkedRecordReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceKind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetKind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangesJson = table.Column<string>(type: "text", nullable: false),
                    TargetSnapshotJson = table.Column<string>(type: "text", nullable: false),
                    Revision = table.Column<Guid>(type: "uuid", nullable: false),
                    IsMismatch = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LinkedRecordReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LinkedRecordReviews_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LinkedRecordReviews_TripId_SourceId_TargetId",
                table: "LinkedRecordReviews",
                columns: new[] { "TripId", "SourceId", "TargetId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LinkedRecordReviews");
        }
    }
}
