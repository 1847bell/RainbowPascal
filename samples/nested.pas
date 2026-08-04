program NestedRainbowSample;

{$APPTYPE CONSOLE}

procedure Run;
begin
  if True then
  begin
    if False then
      WriteLn('first branch')
    else
      WriteLn('second branch');
  end
  else
    WriteLn('outer branch');
end;

begin
  Run;
end.
