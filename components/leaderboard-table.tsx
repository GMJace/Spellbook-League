type LeaderboardEntry = {
  id: string;
  name: string;
  ownerName: string;
  gamesPlayed: number;
};

export function LeaderboardTable({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  if (!entries.length) {
    return <div className="empty">No characters have logged games yet.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Character</th>
            <th>Owner</th>
            <th>Games played</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.name}</td>
              <td>{entry.ownerName}</td>
              <td>{entry.gamesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
